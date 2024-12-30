# 不同的包管理器对于node_module影响

场景*：一个项目（base）中引入了两个包（例如：packageTest 和 lodash），其中一个包（packageTest）里又引入了与这个项目引入的另一个包相同的包（lodash）。*

> 探索：为什么后端会出现 maven 循环依赖的问题，而前端的包则不会。
>
> maven 是在项目构建时拉取依赖，它会按照解析项目中的 pom.xml 文件确定项目所依赖的库和插件的**唯一版本号**，构建依赖树。

## 本地原始包

`npm pack`打出包始终参考的是 package.json 文件。

- 无论用什么依赖管理器，在 init 的时候都是创建出项目的 package.json。

## npm

> node: 20，npm：10

**情形一**：对于引入的共同的包（lodash）相同的版本，npm只会存一个包，两者公用，并且npm会将项目（base）中引入的包和引入的包中的包全部平铺在 node_modules 目录下。只要项目中或者项目中引入的包（packageTest ）还在使用这个包（lodash），这个包在node_modules 下就不会消失。

> 所以对于相同版本的包是不会下载两遍的。

------

**情形二：**对于引入的共同的包（lodash）不相同的版本，npm **默认会将两个不同版本的包都下载一份**，但是**在 node_modules 中顶层只会存在当前 install 的版本**，在引入的包（packageTest ）中的 node_modules 会存在它所需的版本。（其它没有共用的依赖也还是会平铺在 node_modules 中顶层的）

> 版本冲突问题：
>
> - 默认情况下不会冲突，不同就都下载下来。所以也不会出现 maven 循环依赖的问题？

### package依赖管理

#### engines

设置了此软件包/应用程序在哪个版本的 Node.js 上运行，以避免因为环境不匹配而导致的不稳定或错误。

```json
// package.json
{
    engines: {
        "node": ">= 14.0.0"
    },
}
```

**作用**：

- 确保运行环境的兼容性；
- 提供警报信息；
- 更好的可移植性；

#### peerDependencies

> 对同一个包，不共存于 dependencies。

```json
{
  "name": "packagetest",
  "version": "1.0.0",
  "description": "",
  "private": false,
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "engines": {
    "node": "<= 14"
  },
  "peerDependencies": {
    "lodash": "^4.16" // 大于该版本的包都可以视为有效的 dependencies
  }
}
```

设置好包（packageTest）的 peerDependencies 后，**对于在引入这个包的项目中存在符合的版本，就会与其共用一个**，情况就和情形一相同。

如果在 **peerDependencies 不兼容报错**的情况下，仍然想下载该依赖，则可以使用：

- **--legacy-peer-deps**：将设置有peerDependencies的包中的该字段保留下来，将该记录存放在 package-lock.json 中。

- **--force**：将peerDependencies的字段保留，并禁用所有的推荐保护。

> **注意：两者都只会下载该包本身，而不会再去下载其中与项目不兼容的依赖。**

如果一个package中同时存在对同一个第三方库引入的 dependencies 和 peerDependencies，则会遵从 dependencies 里的版本，情况就和情形二相同。

> 相当于同之前引入的共同的包（lodash）不相同的版本情况，只是在引入的包中多了 peerDependencies 字段设置。（两个都有好像没有什么意义-见补充2）

**作用**：

- **解决依赖冲突**：将共享的依赖声明为同级依赖，从而避免因为依赖冲突而导致的问题。
- **提供可选依赖支持**：有些**软件包可能提供了可选的功能**，如果项目需要使用这些功能，可以通过声明 `peerDependencies` 来表明对这些可选功能的依赖，使得开发者能够根据项目需求来选择是否安装。（peerDependenciesMeta）
- **增强模块化**：通过将一些功能模块声明为 `peerDependencies`，可以将项目的功能模块化程度提高，使得各个功能模块之间的关系更加清晰。

常用使用 peerDependencies 的包：eslint、vue、typescript等。

#### peerDependenciesMeta

为 `peerDependencies`提**供可选功能**，**有些依赖（包）可能只是用于该项目的部分功能，而这些功能可由开发者自行选择**，所以这部分的依赖（包）也是由开发者自己选择安装。**这些可选功能部分的依赖（包）（axios）不会在下载该包（packageTest）时自动下载。**

```json
{
  // packageTest...
  "engines": {
    "node": "<= 14"
  },
  "dependencies": {
    "lodash": "4.16"
  },
  "peerDependencies": {
    "axios": "^1.7.7"
  },
  "peerDependenciesMeta": {
    "axios":{ // 可选
      "optional": true
    }
  }
}
```

**注意**：虽然说提供一个可选依赖，但是**如果该可选依赖的版本与项目中的版本有冲突，也是会产生 peerDependencies 不兼容的报错！**

####  补充

- 使用npm每次进行pack都是重新打包一个新的，不会在意package.json中的version的变换。
- 当一个 package.json 文件中只存在一个 peerDependencies/dependencies ，npm install下载的包会自动存放进 peerDependencies/dependencies。（相当于对于同一个包两种不可共存在这两个字段中，即使这么写了也没有意义）

### package-lock.json

与 package.json 相类似的格式记录项目中所有包的依赖管理文件，包含所有依赖包内部所依赖的依赖包。

## pnpm

> node: 20，pnpm：9.4.0

通过 pnpm 管理的依赖**不会像 npm 一样将绝大部分依赖包都存放在 node_modules 顶层**，pnpm **在 node_modules 顶层存放的是对该依赖包的引用**（软链接、快捷方式），将包真正**存放在 node_modules 顶层的另一个文件 .pnpm 中**，这样所有的依赖都会共用这个文件，每当**有共同的依赖版本时就可以直接链接到这里**。（symbilic link）

**情形一**：针对相同的依赖版本包**只会下载一个放在 .pnpm 下**，其他所有依赖该依赖包的包靠链接的形式找到这个依赖。

**情形二**：针对不同版本的依赖包会**将两个不同的版本都下载下来放在 .pnpm 下**，其他所有依赖该依赖包的包靠链接的形式找到这个依赖。

> 注意：
>
> - **node_modules 顶层**存放的是**该项目所依赖的包结构**（这点和 npm 一致，只不过一个存的是本体一个是链接），该**项目所使用的依赖包本体**和**其他依赖包中所用到的依赖包**会**平铺放在 .pnpm 中**，并会**在 .pnpm 下创建另一个 node_modules（` .pnpm/node_modules`） 用来存放所有用过的依赖包的链接**。
> - 顶层**存放的软链接的依赖包也会有正常的依赖包的结构**，只不过结构中的依赖包也是以软链接的形式链接到 .pnpm 中。

**关于卸载**：

pnpm uninstall 某个依赖包之后，其依赖引用虽然从  node_modules 顶层消失了，但这个依赖包的本体版本任会存在在 .pnpm 中（缓存文件），并且在 .pnpm 还有另一个 node_modules 文件，用于存放曾经下载过的包引用。（uninstall 操作**仅仅只是将 node_modules 顶层下该依赖包的软链接删除掉**）

### package依赖管理

#### peerDependencies

**情形一：**对于**不存在依赖包内的 peerDependencies 里的依赖**，pnpm 会**将其全部下载下来（包括依赖中的依赖）放到 .pnpm 下**。

**情形二**：对于**已经在父项目中存在的依赖**，pnpm **默认会以父项目的版本为准（只会存在一个）**，不会再单独下载依赖中 peerDependencies 里的版本，并且**不会报错**，但是**会产生 warning**。

> 注意：peerDependencies 的软链接（symlink）不支持对同一个依赖的不同版本的链接。但是**在 dependencies 中，如果版本不一样，不同版本全都都会下载下来！！！**

## yarn

> node: 20，yarn：1.22.21

yarn 会将依赖存放在 node_modules 顶层中，并在顶层 node_modules 中（当前项目的 node_modules）生成一个 .yarn-integrity 文件，**该文件中将该项目中所用到的所有依赖（包括依赖的依赖，相同依赖的不同版本）平铺在一个对象中（lockfileEntries）**。

**情形一**：针对**相同的依赖版本包只会下载一次**放在 node_modules 的顶层，并在  .yarn-integrity 文件生成一条记录。

**情形二**：针对**相同依赖的不同版本包**保留依赖其在原项目中的依赖结构，不对其提升到 node_modules 顶层，并在  .yarn-integrity 文件生成一条记录。。

> 这两点情况同 npm。但是 npm 在 node_modules 顶层生成的 package-lock.json 文件中的依赖结构不是扁平的，而是根据原先依赖的结构存放。

### package依赖管理

**情形一：**对于**不存在依赖包内的 peerDependencies 里的依赖**，yarn 默认不会下载，只会发出 unmet warning。

**情形二（同 pnpm）**：对于**已经在父项目中存在的依赖**，yarn **默认会以父项目的版本为准（只会存在一个）**，不会再单独下载依赖中 peerDependencies 里的版本，并且**不会报错**，但是**会产生 warning**。

# pack

> 版本号：package.json 的 version 字段。

- npm：根据新的 package.json 的配置打出一个新的包，只要有更新打出来的就是新的。
- yarn：版本号不变，打出来的包也是不变的，即使 package.json 的配置发生了变化。（可能yarn做了缓存吧）

> *补充*：后续测试好像 npm 也会因为缓存打出来的包不变！！！？？？
>
> 发现原因：应该是依赖的 pack 和复制过来之后原有的没删除，导致引入该依赖包后把打出的 pack 又引入了一边，install 时就不知道走哪个了？
